import {useEffect, useState} from "react"
import Builder from "./Builder"
import GeneralInformation from "./steps/GeneralInformation/GeneralInformation"
import {ref, serverTimestamp, set, update} from "firebase/database"
import {v4 as uuid} from "uuid"
import {db} from "@/db/firebase"
import {showNotification} from "@/helpers/showNotification"
import {useRouter} from "next/router"
import {useContext} from "react";
import {UserAuthBuilder} from "../../../context/context";

const initialData = {
  id: '',
  regionName: '',
  time: serverTimestamp(),
  status: false,
  like: 0,
  reports: 0,
  title: '',
  description: '',
  userId: '',
  userName: '',
  completeVotingCount: 0,
  valuesBtnVoting: {
    'one': 0.1,
    'two': 0.5,
    'three': 1
  },
  colorRange: ["orange", "yellow", "green"],
  domainRange: [0,100]
}

const Dashboard = (props) => {
  const contextUserData = useContext(UserAuthBuilder)

  const router = useRouter()
  //const regionItemId = router.query.data

  const [values, setValues] = useState(initialData)
  const [editedValues, setEditedValues] = useState({})
  const [loading, setLoading] = useState(false)

  const [errors, setErrors] = useState({})
  console.log(values, 'values')

  // useEffect(() => {
  //   if (props.edit === 'edit') {
  //     setValues(contextQuizObject.quizObject)
  //   } else {
  //     setValues(initialData)
  //   }
  // }, [])

  const addFieldItem = (item, field) => {
    setValues({...values, [field]: [...values[field], item]})
    setEditedValues({...editedValues, [field]: [...values[field], item]})
  }

  const updateFieldItem = (item, field) => {
    console.log(item, field, 'item, field')
    const array = [...values[field]]
    array[array.findIndex(arrayItem =>
      arrayItem._id ?
        arrayItem._id === item._id :
        arrayItem.id === item.id
    )] = item
    setValues({...values, [field]: array})
    setEditedValues({...editedValues, [field]: array})
  }

  const removeFieldItem = (index, field) => {
    const array = [...values[field]]
    array.splice(index, 1)
    setValues({...values, [field]: array})
    setEditedValues({...editedValues, [field]: array})
  }

  const steps = [
    {
      label: "Загальна інфомація",
      content:
        <GeneralInformation
          values={values}
          setValues={(field, value) => {
            const updatedValues = {...values, [field]: value}
            const editValues = {...editedValues, [field]: value}
            field !== 'socialNetworks' && updatedValues.socialNetworks?.forEach(network => network.updated = false)
            setValues(updatedValues)
            setEditedValues(editValues)
          }}
          errors={errors}
          setErrors={setErrors}
        />,
    },
    // {
    //   label: "Налаштування карти",
    //   content:
    //     <MapSettings
    //       values={values}
    //       setValues={setValues}
    //       addEducationItem={(item) => addFieldItem(item, 'questions')}
    //       updateEducationItem={(item) => updateFieldItem(item, 'questions')}
    //       removeEducationItem={(index) => removeFieldItem(index, 'questions')}
    //       errors={errors}
    //       setErrors={props.setErrors}
    //     />
    // },
  ]

  const submit = () => {
    // if (Object.keys(contextQuizObject.quizObject).length > 0 && props.edit === 'edit') {
    //   const updateData = {
    //     id: contextQuizObject.quizObject?.id,
    //     regionName: contextQuizObject.quizObject?.regionName,
    //     time: serverTimestamp(),
    //     status: true,
    //     like: values.like,
    //     questionPic: values.questionPic || '',
    //     reports: values.reports,
    //     questions: values.questions,
    //     quizTitle: values.quizTitle,
    //     quizSynopsis: values.quizSynopsis || '',
    //     nrOfQuestions: values.nrOfQuestions,
    //     userId: contextValue.authObj.userId,
    //     userName: contextValue.authObj.userName,
    //     appLocale: {
    //       "landingHeaderText": "<questionLength> запитань",
    //       "question": "",
    //       "startQuizBtn": "Розпочати тест",
    //       "resultFilterAll": "Всі",
    //       "resultFilterCorrect": "Правильні",
    //       "resultFilterIncorrect": "Не правильні",
    //       "prevQuestionBtn": "Назад",
    //       "nextQuestionBtn": "Продовжити",
    //       "resultPageHeaderText": "Ви завершили тест. Ви набрали <correctIndexLength> з <questionLength> питань."
    //     },
    //     completeQuizCount: 0,
    //   }
    //   const dbRef = ref(db, 'regions/' + contextQuizObject.quizObject?.regionName + '/' + contextQuizObject.quizObject?.id)
    //   const dbRefUser = ref(db, 'users/' + contextValue.authObj.userId + '/' + contextQuizObject.quizObject?.id)
    //   update(dbRef, updateData).then(() => {
    //     update(dbRefUser, updateData).then(() => {
    //       contextQuizObject.setQuizObject({})
    //     })
    //   }).then(() => {
    //     showNotification('Оновлено regions', 'success')
    //   }).catch((err) => {
    //     console.log(err)
    //   })
    // } else if (!props.edit) {
      const id = uuid()
      const data = {
        id: id,
        regionName: 'ukraine',
        time: serverTimestamp(),
        status: false,
        like: values.like,
        reports: values.reports,
        title: values.title,
        description: values.description || '',
        userId: contextUserData?.user?.userId || '',
        userName: contextUserData?.user?.userName || '',
        completeQuizCount: 0,
        voting: []
      }
      set(ref(db, 'maps/' + id), data).then(() => {
        setLoading(false)
        setValues(initialData)
        showNotification("Ваша карта опублікована. Після схвалення вона буде доступна", 'success')
        // set(ref(db, 'users/' + contextValue.authObj.userId + '/' + id), data).then(() => {
        //   setLoading(false)
        //   setValues(initialData)
        //   showNotification("Ваш квест зараз розглядається нашою командою. Після схвалення він буде опублікований і доступний на карті", 'success')
        // })
      })
    }
  //}

  return (
    <Builder
      values={values}
      loading={false}
      content={steps}
      submit={() => submit()}
    />
  )
}

export default Dashboard
