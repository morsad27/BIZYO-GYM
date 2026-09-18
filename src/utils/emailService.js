import emailjs from "@emailjs/browser";

const SERVICE_ID = "service_fymwapo";
const TEMPLATE_ID = "template_7toksgp";
const PUBLIC_KEY = "m5ynOyqA9D43ojiUv";

export const sendMembershipExpirationEmail = async ({
  toName,
  toEmail,
  membership,
  expirationDate,
  daysRemaining,
}) => {
  try {
    const response = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_name: toName,
        to_email: toEmail,
        membership,
        expiration_date: expirationDate,
        days_remaining: daysRemaining,
      },
      PUBLIC_KEY,
    );

    console.log(
      "Expiration email sent:",
      response.status,
      response.text,
    );

    return {
      success: true,
      response,
    };
  } catch (error) {
    console.error(
      "Error sending expiration email:",
      error,
    );

    return {
      success: false,
      error,
    };
  }
};