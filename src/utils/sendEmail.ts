import nodemailer from "nodemailer";
import { env } from "process";

// async..await is not allowed in global scope, must use a wrapper
export async function sendEmail(to: string, html: string) {
  // Generate test SMTP service account from ethereal.email
  // Only needed if you don't have a real mail account for testing
  //   let testAccount = await nodemailer.createTestAccount();
  //   console.log('testAccount:', testAccount)

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    service: "Gmail",
    // prot: 587,
    host:'smtp.gmail.com',
    secure: false,
    requireTLS: true,
    // secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.GMAIL_ID, // generated ethereal user
      pass: process.env.GMAIL_PASSWORD, // generated ethereal password
    },
  });

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: '"🚀 wingman 🐱‍🏍" <'+process.env.GMAIL_ID+'>', // sender address
    to: to, // list of receivers
    subject: "Change Password ✔", // Subject line
    html: html, // html body
  });

  console.log("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}
