import {auth, db, GoogleProvider} from "../../../db/firebase"
import {useState} from "react"

const AnonymouslyLogin = ({setAuthData}) => {
  const [loading, setLoadingDb] = useState(false)

  return (
    <div>
      <div className="auth-container">
        <button
          className="button-login"
          onClick={async () => {
            setLoadingDb(true)
            await auth.signInAnonymously()
              .then((response) => {
                const {user} = response
                setAuthData(prevState => ({
                  ...prevState,
                  isAuthenticated: true,
                  userId: user.uid,
                }))
                setLoadingDb(false)
              }).then(async () => {
                if (auth.currentUser) {
                  const tokenId = await auth.currentUser.getIdToken()
                  setAuthData(prevState => ({
                     ...prevState,
                     token: tokenId || ''
                   }))
                  return auth.currentUser.getIdToken()
                }
              }).catch(error => console.log(error))
          }
          }
        >
          {loading ? 'Завантаження...' : ' Підтвердити через Aнонімний вхід'}
        </button>
      </div>
    </div>
  )
}

export default AnonymouslyLogin
