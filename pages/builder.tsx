import {useContext, useEffect} from "react"
import {ToastContainer} from "react-toastify"
import '../src/app/globals.css'
//import {RegionContext} from "./_app"
import Dashboard from "../src/components/Builder/Dashboard"
import {useRouter} from "next/router"

const BuilderPage = () => {
  const router = useRouter()
  //const edit = router.query.data
  //const contextRegion = useContext(RegionContext)

  // useEffect(() => {
  //    if (contextRegion.region === 'default' || contextRegion.region === undefined) {
  //      router.push('/')
  //    }
  //  }, [])

  return (
    <>
      <Dashboard
        //edit={edit}
      />
      <ToastContainer/>
    </>
  )
}

export default BuilderPage
