"use client"
import {useEffect, useState} from "react"
import {useRouter} from "next/router"
import {auth} from '@/db/firebase'
import {db} from "@/db/firebase"
import {ref, child, get, set} from "firebase/database"
import MapUa from '@/components/MapUa/MapUa'
import Modal from '@/components/Modal/Modal'
import Voting from "@/components/Voting/Voting"
import AnonymouslyLogin from "@/components/Auth/AnonymouslyLogin/AnonymouslyLogin"
import Login from "@/components/Auth/Login/Login"
import {ToastContainer} from "react-toastify"
import {showNotification} from "@/helpers/showNotification"
import "../src/app/globals.css"

export default function Id() {
  const router = useRouter()
  const id = router.query.id
  const tasksRef = ref(db)

  const region = {
    region: '',
    value: 0
  }

  const valuesBtnVoting = {
    'one': 0.1,
    'two': 0.5,
    'three': 1
  }

  const initialState = {
    token: "",
    isError: false,
    errorMessage: "",
    userId: "",
    isAuthenticated: false,
  }

  const [modal, setModal] = useState(false)

  const [authData, setAuthData] = useState(initialState)
  const [regionData, setRegionData] = useState(region)
  const [usersVoting, setUsersVoting] = useState({})
  const [checkIfSetValue, setCheckIfSetValue] = useState(true)

  const [btnVotingActive, setBtnVotingActive] = useState(null)

  const [itemMap, setItemMap] = useState({})
  const [loading, setLoadingDb] = useState(false)

  const getMapApp = async () => {
    setLoadingDb(true)
    try {
      get(child(tasksRef, `ukraine/${id}`)).then((snapshot) => {
        if (snapshot.exists()) {
          setItemMap(snapshot.val())
          setLoadingDb(false)
        } else {
          console.log("No data available")
        }
      }).catch((err) => {
        console.error(err)
      })
    } catch (error) {
      console.log(error)
    }
  }


  const getDataUsers = () => {
    const dataArray = Object.keys(itemMap.voting || {}).length > 0 ? Object.values(itemMap.voting) : []
    console.log(dataArray, 'dataArray')
    const result = {}
    dataArray.forEach(obj => {
      for (const userId in obj) {
        const { region, value } = obj[userId]
        if (!result[region]) {
          result[region] = 0
        }
        result[region] += value
      }
    })
    setUsersVoting(result)
  }

  useEffect(() => {
    if (router.isReady) {
      getMapApp().catch((error) => {
        console.log(error)
      })
    }
  }, [router.isReady])

  useEffect(() => getDataUsers(), [itemMap])

  return (
    <>
      <main className="min-h-screen flex-col items-center justify-between p-24">
        <MapUa
          modal={modal}
          setModal={setModal}
          setRegionData={setRegionData}
          regionData={regionData}
          usersVoting={usersVoting}
        />
      </main>
      {modal && (
        <Modal
          setModal={setModal}
          setRegionData={setRegionData}
          regionData={regionData}
        >
          <button onClick={() => {
            setRegionData({
              ...regionData,
              region: '',
              value: 0,
            })
            setModal(false)
            setBtnVotingActive(null)
            setCheckIfSetValue(true)
            auth.signOut().then( () => {
              setAuthData(prevState => ({
                ...prevState,
                isAuthenticated: false,
                userId: '',
                token: ''
              }))
            }, function(error) {
              console.error('Sign Out Error', error)
            })
          }}>X
          </button>
          <div>{regionData.region}</div>
          <Voting
            setRegionData={setRegionData}
            regionData={regionData}
            setCheckIfSetValue={setCheckIfSetValue}
            setBtnVotingActive={setBtnVotingActive}
            btnVotingActive={btnVotingActive}
            valuesBtnVoting={valuesBtnVoting}
          />
          {!checkIfSetValue && !authData?.userId ?
            <>
              <Login setAuthData={setAuthData}/>
              <AnonymouslyLogin setAuthData={setAuthData}/>
            </>
            : null
          }
          {authData?.userId ? <button
            disabled={checkIfSetValue}
            onClick={() => {
              set(ref(db, `ukraine/${id}/voting/${regionData.region}/${authData.userId}`), {
                userId: authData.userId,
                region: regionData.region,
                value: regionData.value,
              }).then(() => {
                showNotification("Ваш голос записаний!", 'success')
                setCheckIfSetValue(true)
                setRegionData({
                  ...regionData,
                  value: 0,
                })
              }).then(() => {
                getMapApp()
              }).catch((err) => {
                console.log(err)
              })
            }
          }
          >Підтвердити голос</button> : null}
        </Modal>
      )
      }
      <ToastContainer/>
    </>
  )
}
