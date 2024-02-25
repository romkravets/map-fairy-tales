"use client"
import {useEffect, useState} from "react"
import MapUa from '@/components/MapUa/MapUa'
import Modal from '@/components/Modal/Modal'
import Voting from "@/components/Voting/Voting"
import {ref, child, get, set} from "firebase/database"
import {db} from "@/db/firebase"
import Login from "@/components/Auth/Login/Login"
import {auth} from '@/db/firebase'
import {ToastContainer} from "react-toastify"
import {showNotification} from "@/helpers/showNotification"
import AnonymouslyLogin from "@/components/Auth/AnonymouslyLogin/AnonymouslyLogin"
import "../src/app/globals.css"

export default function Id() {
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

  console.log(regionData, 'regionData')
  console.log(usersVoting, 'usersVoting')
  console.log(btnVotingActive, 'btnVotingActive')


  const getDataUsers = () => {
    try {
      get(child(tasksRef, `users`)).then((snapshot) => {
        if (snapshot.exists()) {
          const dataArray = Object.keys(snapshot.val() || {}).length > 0 ? Object.values(snapshot.val()) : []
          const result = {};
          debugger
          dataArray.forEach(obj => {
            for (const userId in obj) {
              const { region, value } = obj[userId];
              if (!result[region]) {
                result[region] = value;
              }
              for (let i = 1; i <= value.length; i++) {
                if (typeof value[i] === 'number') {
                  result[region][i] += value[i];
                }
              }
            }
          });
          setUsersVoting(result)
        } else {
          console.log("No data getDataUser available")
        }
      }).catch((err) => {
        console.error(err)
      })
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => getDataUsers(), [])

  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
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
              set(ref(db, `users/${regionData.region}/${authData.userId}`), {
                userId: authData.userId,
                region: regionData.region,
                value: regionData.value,
              }).then(() => {
                showNotification("Ваш голос записаний!", 'success')
                setCheckIfSetValue(false)
                setRegionData({
                  ...regionData,
                  region: '',
                  value: 0,
                })
              }).then(() => {
                getDataUsers()
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
