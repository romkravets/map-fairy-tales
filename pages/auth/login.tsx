import Head from "next/head"
import LoginBuilder from "../../src/components/Auth/LoginBilder/LoginBilder"
import '../../src/app/globals.css'

const LoginPage = () => {
  return (
    <>
      <Head>
        <title>Login</title>
        <meta name="description" content="" />
      </Head>
      <LoginBuilder />
    </>
  )
}
export default LoginPage
