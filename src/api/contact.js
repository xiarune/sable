import api from "./client";

const contactApi = {
  send: (name, email, subject, message) =>
    api.post("/contact", { name, email, subject, message }),
};

export default contactApi;
