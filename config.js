var config = {

    kapUrl: "https://www.kap.org.tr", // kap url
    errorLogFile : "errors.log", // error log's file
    databaseName: "test", // mongoDb db name
    collectionName: "tickers", // mongo db collection name
    connectURI: "mongodb://localhost:27017/", // mongo db connect uri
    mongoRiskLevelField: "riskLevel", // mongo db field name
    mongoRiskGroupField : "riskGroup", // mongo db field name
    mongoFonCodeField: "symbol", // mongo db field name
    errorLogToMail: "oguzhan.v.arslan@gmial.com" // error mail to
}

// Risk groups values
var riskGroups = {
    veryLow : "very_low",
    low : "low",
    medium : "medium",
    high: "high",
    veryHigh : "very_high"
}

module.exports = {config, riskGroups}