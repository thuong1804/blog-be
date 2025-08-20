import { sendEmail } from "../../services/mailService.js";
import { getTemplate } from "../../utils/index.js";

export const sendMailResolvers = {
  Mutation: {
    contact: async (_, { name, email, phone, subject, message }) => {
      try {
        await sendEmail({
          to: process.env.EMAIL_USER,
          subject: `📩 Contact: ${subject}`,
          html: `
            <h3>New contact message</h3>
            <p><b>Name:</b> ${name}</p>
            <p><b>Email:</b> ${email}</p>
            <p><b>Phone:</b> ${phone || "N/A"}</p>
            <p><b>Message:</b></p>
            <p>${message}</p>
          `,
        });
        return true;
      } catch (err) {
        console.error("Contact send error:", err);
        return false;
      }
    },
    subscribeSubmit: async (_, { email }) => {
      try {
        const htmlContent = getTemplate("welcomeTemplate.html", {
          year: new Date().getFullYear(),
        }, 'src/template-html');

        await sendEmail({
          to: email,
          subject: "🎉 Thanks for subscribing to our newsletter!",
          html: htmlContent,
        });

        return true;
      } catch (err) {
        console.error("Subscribe send error:", err);
        return false;
      }
    },
  },
};
