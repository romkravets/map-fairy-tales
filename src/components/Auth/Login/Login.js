import {auth, db, GoogleProvider} from "@/db/firebase"
import {useState} from "react"
import {useContext} from "react";
import {UserAuthBuilder} from "../../../../context/context";

const Login = () => {
  const { setUser } = useContext(UserAuthBuilder);

  const [loading, setLoadingDb] = useState(false)

  return (
    <div>
      <div className="auth-container">
        <button
          className="button-login"
          onClick={async () => {
            setLoadingDb(true)
            await auth.signInWithPopup(GoogleProvider)
              .then((response) => {
                const {user} = response
                setUser(prevState => ({
                  ...prevState,
                  isAuthenticated: true,
                  userId: user.uid,
                 // email: user!.email,
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
              }).catch(error => console.log(error))
          }
          }
        >
          {loading ? 'Loading...' : ' LogIn/SignUp Google'}
        </button>
      </div>
    </div>
  )
}

export default Login
