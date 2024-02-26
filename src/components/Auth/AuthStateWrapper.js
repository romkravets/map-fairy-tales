import { useEffect, useContext } from "react"
import { useRouter } from "next/router"
import {auth} from "../../db/firebase"
import {ThemeContext} from "../../../pages/_app"

const AuthStateWrapper = ({ children }) => {
  //const router = useRouter()
  const contextValue = useContext(ThemeContext)

  useEffect(() => {
    const handleAuthStateChanged = async (user) => {
      if (user) {
        try {
          const idToken = await user.getIdToken()
          contextValue.setAuthObject(prevState => ({
            ...prevState,
            isAuthenticated: true,
            token: idToken,
            email: user.email,
            userName: user.displayName,
            userId: user.uid,
          }))
          //router.push(`/builder`)
        } catch (error) {
          console.error(error)
        }
      } else {
         // if (router.pathname.includes('builder')) {
         //   return router.push('/')
         // }
      }
    }

    const unsubscribe = auth.onAuthStateChanged(handleAuthStateChanged)
    return () => unsubscribe()
  }, [contextValue])

  return <>{children}</>
}

export default AuthStateWrapper
