import {useRouter} from "next/router"
import Link from "next/link"

const BuilderLayout = ({ children }) => {
  const router = useRouter()

  return (
    <div className="builder">
      <nav className="builder-nav">
        <ul className="builder-ul">
          <li className="builder-li-main"><Link href="/">Головна</Link></li>
          <li className="builder-li-builder"><Link href="/builder">Конструктор</Link></li>
          <li className="builder-li-profile">
            <Link href="/builder/settings">Налаштування</Link>
          </li>
          <li className="builder-li-exit">
            {/*<button onClick={()=> {*/}
            {/*  auth.signOut().then( () => {*/}
            {/*    contextValue.setAuthObject(prevState => ({*/}
            {/*      ...prevState,*/}
            {/*      isAuthenticated: false,*/}
            {/*      userName: '',*/}
            {/*      userId: '',*/}
            {/*      email: '',*/}
            {/*      token: ''*/}
            {/*    }))*/}
            {/*    router.push('/')*/}
            {/*  }, function(error) {*/}
            {/*    console.error('Sign Out Error', error)*/}
            {/*  })*/}
            {/*}}>Вихід</button>*/}
          </li>
        </ul>
      </nav>
      {children}
    </div>
  )
}

export default BuilderLayout
