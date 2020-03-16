var request = require('request')
var htmlParser = require('node-html-parser')
var fs = require('fs')
var MongoClient = require('mongodb').MongoClient
var config = require('./config')
var sendMail = require('./mail')


var kapUrl = config.kapUrl
var errorLogFile = config.errorLogFile
var databaseName = config.databaseName
var collectionName = config.collectionName
var connectURI = config.connectURI
var riskLevelField = config.mongoRiskLevelField
var fonCodeField = config.mongoFonCodeField


function writeLog(error) {
    let date_ob = new Date()
    let errorMessage = `${date_ob.getDay()}-${date_ob.getMonth()}-${date_ob.getFullYear()} ${date_ob.getHours()}:${date_ob.getMinutes()}:${date_ob.getSeconds()}`
    errorMessage += ' --- ' + String(error) + ' \n'

    fs.appendFile(errorLogFile, errorMessage, err => {
        if (err) throw err
        console.log('[+] Error Writed !')
    })
}

function asyncRequest(url) {
    return new Promise((resolve, reject) => {
        request.get(url, (error, resp, body) => {
            if (!error && resp.statusCode == 200) {
                resolve(body)
            } else {
                reject(error)
            }
        })
    })
}

async function getAllFonsGroup(url) {
    // return -> [{'fonGroupName':'qwe', 'link': 'https://qwe'}]

    let respBody = await asyncRequest(url)
    let result = htmlParser.parse(respBody).querySelectorAll('.submenu-item')
        .filter(e => e.tagName == 'a' && e.rawAttrs.includes('/YatirimFonlari/'))
        .map(e => { return { 'fonGroupName': e.text, 'link': `${kapUrl + e.getAttribute('href')}` } })
    return result
}


async function getSubFons(fonGroupUrl) {
    // return -> [{'fonName': 'qwe', 'link': 'qwe', 'fonCode': 'qwe'}]
    let result = []
    let respBody = await asyncRequest(fonGroupUrl)
    let allRow = htmlParser.parse(respBody).querySelectorAll('.comp-row')

    allRow.forEach(e => {
        if (e.querySelectorAll('.vcell').length > 0) {
            let vCell = e.querySelectorAll('.vcell')
            let fonCode = vCell[0].text.trim()
            let fonName = vCell[1].text.trim()
            let link = kapUrl + vCell[1].getAttribute('href').replace('/ozet/', '/genel/')
            result.push({ 'fonName': fonName, 'fonCode': fonCode, 'link': link })
        }

    })

    return result

}

async function getSubFonGeneralInfos(subFonUrl) {
    /*  
        Complex (unexpected) data
        Dynamic json key values
    
    return data:
                [{
                    'root Info Title': {'subtitle1', 'info1', 'subtitle2': [{'qwe':'123'}] ...},
                    'root Info Title 2': {...},
                    ...
                },
                    ...
                ]
    */
    let i
    let j
    let k
    let x

    let respBody = await asyncRequest(subFonUrl)
    let rootInfoTitles = htmlParser.parse(respBody).querySelectorAll('.column-type4.button-collapse-acc.vtable').map(e => e.text.trim())
    let subTitleInfoTables = htmlParser.parse(respBody).querySelectorAll('.sub-collapseblock')

    let result = []
    for (i = 0; i < rootInfoTitles.length; i++) {
        let myobject = new Object()
        myobject[rootInfoTitles[i]] = new Object()
        let currentTable = subTitleInfoTables[i];

        let tableSubtitles = currentTable.querySelectorAll('.column-type1.vtable.alignTextToLeft')
        // console.log(tableSubtitles.length)
        let tableObject = new Object()

        for (j = 0; j < tableSubtitles.length; j++) {
            let subtitle = tableSubtitles[j].text.trim()
            let subtitleValue = currentTable.querySelectorAll('.exportDiv,.column-type3')[j]
            let subTitleValueExportClass = subtitleValue.querySelectorAll('.exportClass')
            if (subTitleValueExportClass.length == 0) {
                let clearTextValue = subtitleValue.text.trim()
                tableObject[subtitle] = clearTextValue;
            } else {
                // subtitle value is table
                let valueTable = subTitleValueExportClass[0]
                let tableRows = valueTable.querySelectorAll('.infoRow.a-table-row')
                if (tableRows.length == 1) {
                    // subtitle value is not table.. False alarm
                    tableObject[subtitle] = tableRows[0].text.trim()
                    continue
                }
                let tableHeaderDatas = tableRows[0].querySelectorAll('.infoColumn').map(e => e.text.trim())

                let tableDatas = []
                for (k = 0; k < tableRows.length - 1; k++) {
                    let rowObject = new Object()

                    let selectedRow = tableRows[k + 1]
                    let allTableBodyData = selectedRow.querySelectorAll('.infoColumn').map(e => e.text.trim())

                    for (x = 0; x < tableHeaderDatas.length; x++) { rowObject[tableHeaderDatas[x]] = allTableBodyData[x] }

                    tableDatas.push(rowObject)
                }
                tableObject[subtitle] = tableDatas
            }
        }
        myobject[rootInfoTitles[i]] = tableObject
        result.push(myobject)
    }

    // console.log(JSON.stringify(result))
    return result

}

async function getSubFonRiskValue(subFonUrl) {
    // return fon's risk value (Number) or null
    let i
    let j

    let respBody = await asyncRequest(subFonUrl)
    let rootInfoTitles = htmlParser.parse(respBody).querySelectorAll('.column-type4.button-collapse-acc.vtable').map(e => e.text.trim())
    let subTitleInfoTables = htmlParser.parse(respBody).querySelectorAll('.sub-collapseblock')

    let result = ''
    for (i = 0; i < rootInfoTitles.length; i++) {

        let currentTable = subTitleInfoTables[i];

        let tableSubtitles = currentTable.querySelectorAll('.column-type1.vtable.alignTextToLeft')

        for (j = 0; j < tableSubtitles.length; j++) {
            let subtitle = tableSubtitles[j].text.trim()
            let subtitleValue = currentTable.querySelectorAll('.exportDiv,.column-type3')[j]
            let subTitleValueExportClass = subtitleValue.querySelectorAll('.exportClass')
            if (subtitle.toLowerCase().includes('fonun risk değeri')) {
                let clearTextValue = subtitleValue.text.trim()
                result = clearTextValue
            } else if (subtitle.toLowerCase().includes('fonun yatırım stratejisi ve risk değeri')) {
                // table or not
                try {
                    result = subTitleValueExportClass[0].querySelectorAll('.infoRow.a-table-row')[1].querySelectorAll('.infoColumn')[1].text.trim()

                } catch {
                    result = subtitleValue.text.trim()
                }
            }
        }

    }

    result = result.trim()

    return !isNaN(result) && result != '' ? Number(result) : null
}


async function getAllResult() {
    // Gathering
    let errorCount = 0
    let allResult = []
    try {
        let groupResult = await getAllFonsGroup(kapUrl)

        for (let i = 0; i < groupResult.length; i++) {
            let fonGroupLink = groupResult[i].link
            
            try {
                let subFonsResult = await getSubFons(fonGroupLink)
                console.log("Fon Group >> " + fonGroupLink + ` (${subFonsResult.length})`)

                for (let j = 0; j < subFonsResult.length; j++) {
                    let subFonURL = subFonsResult[j].link
                    let subFonCode = subFonsResult[j].fonCode
                    try {
                        let riskLevel = await getSubFonRiskValue(subFonURL)
                        console.log('>>>> ' + subFonURL + ' : ' + riskLevel )
                        if (riskLevel === null) continue
                        allResult.push({ 'fonCode': subFonCode, 'riskLevel': riskLevel })
                    } catch (error) {
                        console.log(error)
                        writeLog(error)
                        errorCount += 1
                        if (errorCount % 10 == 0 ){
                            sendMail('getSubFonRiskValue() Error !', 'getSubFonRiskValue() --> ' + error)
                        }
                    }
                }
            } catch (error) {
                console.log(error)
                writeLog(error)
                // send Mail 100%
                sendMail('getSubFons() Error !', 'getSubFons() --> ' + error)
            }
        }

    } catch (error) {
        console.log(error)
        writeLog(error)
        // Send Mail... 100%
        sendMail('getAllFonsGroup() Error !', 'getAllFonsGroup() --> ' + error)
    }
    return allResult
}


async function start() {
    // get All data
    let allResult = await getAllResult()

    console.log('[+] MongoDB Update Process Started.')
    // MongoDB Update Risk Level by Fon Code
    MongoClient.connect(connectURI, (err, db) => {
        if (err) throw err
        let dbo = db.db(databaseName)

        for (const result of allResult) {
            let fonCode = result.fonCode
            let riskLevel = result.riskLevel
            let query = {}
            let setData = {}
            query[fonCodeField] = { $regex: `^${fonCode}$`, $options: "i" }
            setData[riskLevelField] = riskLevel
            try {
                dbo.collection(collectionName).updateOne(query, { $set: setData })
            } catch (err) {
                console.log(err)
            }
        }
        db.close()
    });

    console.log('[+] Done.')
}

start()