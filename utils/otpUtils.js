const crypto = require('crypto');
const nodemailer = require('nodemailer');

const generateOTP = () => crypto.randomInt(1000, 9999).toString();

const sendEmail = ({ to, subject, otp, html }) => {
    if (otp && !html) {
        html = `<p>Your OTP is: <strong>${otp}</strong></p>`;
    }

    return new Promise((resolve, reject) => {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.FROM_EMAIL,
                pass: process.env.EMAIL_PASS,
            },
        });

        transporter.sendMail(
            {
                from: process.env.FROM_EMAIL,
                to,
                subject,
                html,
            },
            (error, info) => {
                if (error) {
                    return reject(error);
                }
                resolve(info);
            }
        );
    });
};

module.exports = {
    generateOTP,
    sendEmail
};
