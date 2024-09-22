"use client";
import Head from "next/head"
import LoginBuilder from "../../components/Auth/LoginBilder/LoginBilder"
import '../globals.css'

const LoginPage = () => {
  return (
    <>
      <Head>
        <title>Login</title>
        <meta name="description" content="" />
      </Head>
      <div className="auth-wrapper">
        <LoginBuilder />
      </div>
    </>
  )
}
export default LoginPage
