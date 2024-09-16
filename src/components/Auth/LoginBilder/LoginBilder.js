"use client";
import {auth, GoogleProvider} from "@/db/firebase"
import {useContext, useState} from "react"
import {UserAuthBuilder} from "../../../../context/context"
import {useRouter} from "next/navigation";
import Button from '@mui/material/Button';

const LoginBuilder = () => {
  const { setUser } = useContext(UserAuthBuilder);
  const [loading, setLoadingDb] = useState(false)
  const router = useRouter()

  return (
    <div>
      <div className="auth-container">
        <h3>SignIn/SignUp</h3>
        <Button
          variant="contained"
          className="button-login"
          onClick={async () => {
            setLoadingDb(true)
            await auth.signInWithPopup(GoogleProvider)
              .then((response) => {
                const {user, credential} = response
                setUser(prevState => ({
                  ...prevState,
                  isAuthenticated: true,
                  userName: user?.displayName,
                  userId: user?.uid,
                  email: user?.email,
                }))
                setLoadingDb(false)
              }).then(async () => {
                if (auth.currentUser) {
                  const tokenId = await auth.currentUser.getIdToken()
                  setUser(prevState => ({
                    ...prevState,
                    token: tokenId || ''
                  }))
                  return auth.currentUser.getIdToken()
                }
              }).then(() => {
                router.push(`/settings`)
              }).catch(error => console.log(error))
          }
          }
        >
          {loading ? 'Loading...' : 'SingIn/SignUp with Google'}
        </Button>
      </div>
    </div>
  )
}

export default LoginBuilder
