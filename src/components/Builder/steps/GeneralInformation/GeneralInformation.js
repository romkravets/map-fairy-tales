import Input from "../../inputs/Input"
import TextArea from "../../inputs/TextArea"

const GeneralInformation = ({values, setValues, errors}) => {

  const handleChange = (fieldName, value) => {
    setValues(fieldName, value)
  }

  return (
    <form>
      <div className="block-two-row mobile center">
        <div>
          <Input
            placeholder="Вкажіть назву"
            name="title"
            label="Назва квесту"
            type="text"
            value={values?.title || ""}
            handleChange={(event) => handleChange('title', event.target.value)}
            require
          />
        </div>
      </div>
      <div>
        <TextArea
          placeholder="Вкажіть інформацію"
          name="quizSynopsis"
          type="text"
          label="Опис квесту"
          value={values.description || ""}
          error={errors.description}
          handleChange={(event) => handleChange('description', event.target.value)}
        />
      </div>
    </form>
  )
}

export default GeneralInformation
