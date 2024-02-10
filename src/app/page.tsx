"use client"
import MapUa from '../components/MapUa/MapUa';
import Modal from '../components/Modal/Modal';
import {useEffect, useState} from "react";
import Voting from "@/components/Voting/Voting";
import {v4 as uuid} from "uuid"
import {ref, update, child, get} from "firebase/database"
import {db} from "../db/firebase"

export default function Home() {
  const tasksRef = ref(db)
  const region = {
    id: '',
    region: '',
    value: {
      1: 0,
      2: 0,
      3: 0,
      4: 0
    }
  }
  const [modal, setModal] = useState(false)
  const [regionData, setRegionData] = useState(region)
  const [oldValue, setOldValue] = useState(0)
  console.log(regionData, 'regionData')
  console.log(oldValue, 'oldValue')
  const getFormApp = async (regionName) => {
    try {
      get(child(tasksRef, `regions/${regionName}`)).then((snapshot) => {
        if (snapshot.exists()) {
          setOldValue(snapshot.val())
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

  useEffect(() => {
    getFormApp(regionData.region)
  }, [modal])

  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <MapUa
          modal={modal}
          setModal={setModal}
          setRegionData={setRegionData}
          regionData={regionData}
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
              value: {
                1: 0,
                2: 0,
                3: 0,
                4: 0
              },
              id: ''
            })
            setModal(false)
          }}>X
          </button>
          <div>{regionData.region}</div>
          <div>{oldValue.value}</div>
          <Voting setRegionData={setRegionData} regionData={regionData} getFormApp={getFormApp}/>
          {regionData.value != 0 && <button onClick={() => {
            const regionId = uuid()
            setRegionData({...regionData, id: regionId})
            const dbRef = ref(db, `regions/${regionData.region}`)
            update(dbRef, {value: regionData?.value}).then(() => {
              getFormApp(regionData.region)
            }).catch((err) => {
              console.log(err)
            })
          }
          }>Підтвердити</button>}
        </Modal>
      )
      }
    </>
  );
}
