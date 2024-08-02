'use client'
import { createContext, useState } from "react";
export const Message_data = createContext({});
export const UserAuthBuilder = createContext({});

function Context({ children }) {
const [message, setMessage] = useState();
const [user, setUser] = useState();

return (
  <UserAuthBuilder.Provider value={{ user, setUser }}>
  <Message_data.Provider value={{ message, setMessage }}>
   {children}
  </Message_data.Provider>
  </UserAuthBuilder.Provider >
);
}

export default Context
