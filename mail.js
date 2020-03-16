var nodemailer = require('nodemailer')
var config = require('./config')

var transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
        user: 'akilli.fon.bot@gmail.com',
        pass: 'akilli123'
    }
})

var mailOptions = {
    from: 'akilli.fon.bot@gmail.com',
    to: config.errorLogToMail,
    subject: 'Title1',
    text: 'text text text'
}

function sendMail(subject, text) {
    mailOptions.subject = subject
    mailOptions.text = text
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) console.log(error)
        else console.log('Email sent: '+ info.response)
    })
}

module.exports = sendMail