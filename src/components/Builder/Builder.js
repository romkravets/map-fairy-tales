import {useState, Fragment, useEffect} from "react"

const Step = props => {
  const classes = ['']

  if (props.isActive) classes.push('is-active')
  if (props.isComplete) classes.push('is-complete')
  if (props.isWarning) classes.push('is-warning')
  if (props.isError) classes.push('is-error')
  if (props.isRightToLeftLanguage) classes.push('rightToLeft')

  return (
    <div className={`stepper-step ${classes.join(' ')}`}
    >
      <div className="stepper-indicator">
				<span
          className="stepper-indicator-info"
        >
					{props.isComplete ? (
            <svg className="stepper-tick" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 490 490">
              <path d="M452.253 28.326L197.831 394.674 29.044 256.875 0 292.469l207.253 169.205L490 54.528z"/>
            </svg>
          ) : props.indicator}
				</span>
      </div>
      <div className="stepper-label">{props.label}</div>
    </div>
  )
}

const StepIndicator = props => (
  <div className="stepper-head">
    {props.content.map((el, i) => (
      <Step
        key={i}
        index={i}
        navigateToStepHandler={props.navigateToStepHandler}
        isActive={i === props.currentTabIndex}
        isComplete={el.isComplete}
        isWarning={el.isWarning}
        isError={el.isError}
        isRightToLeftLanguage={props.isRightToLeftLanguage}
        indicator={i + 1}
        label={el.label}
        setCurrentTabIndex={props.setCurrentTabIndex}
        values={props.values}
      />
    ))}
  </div>
)


const Navigation = props => {
  return (
    <div className="stepper-footer form-btn-block">
      <button
        className="btn-transparent"
        onClick={props.previousStepHandler}
        disabled={props.currentTabIndex === 0}
      >
        Назад
      </button>
      <button className="btn stepper-footer-btn btn-continue"
        type="submit"
        //disabled={props?.isLastStep ? props.values?.questions?.length === 0 : !props.values?.title}
        onClick={(e) => (
          props.submitHandler(e)
          //props.isLastStep ? props.submitHandler(e) : props.nextStepHandler(e)
        )}
      >
        {props.loading ? 'Збереження...' : props.isLastStep ? 'Зберегти' : 'Продовжити'}
      </button>
    </div>
  )
}

const Builder = ({content, submit, values, loading}) => {

  const [currentTabIndex, setCurrentTabIndex] = useState(0),
    isLastStep = currentTabIndex === content.length - 1,
    isPrevBtn = currentTabIndex !== 0

  const navigateToStepHandler = (index) => index !== currentTabIndex && setCurrentTabIndex(index)

  useEffect(() => {
    window.scrollTo({top: 0, left: 0, behavior: "smooth"})
  },[currentTabIndex])

  const nextStepHandler = e => {
    e.preventDefault()
      setCurrentTabIndex((prev) => {
        if (prev !== content.length - 1) return prev + 1
      })
  }

  const previousStepHandler = () => setCurrentTabIndex((prev) => prev - 1)
  const submitHandler = () => {
    submit()
  }

  return (
    <div className="user-form">
      <div className="w-100">
        <h2 style={{margin: '20px 30px'}}>Створення квесту</h2>
        <div className="stepper-wrapper">
          <StepIndicator
            content={content}
            navigateToStepHandler={navigateToStepHandler}
            currentTabIndex={currentTabIndex}
            setCurrentTabIndex={setCurrentTabIndex}
            values={values}
          />
          {content.map((el, i) => <Fragment key={i}>{i === currentTabIndex && el.content}</Fragment>)}
          <Navigation
            isPrevBtn={isPrevBtn}
            isLastStep={isLastStep}
            previousStepHandler={previousStepHandler}
            nextStepHandler={nextStepHandler}
            submitHandler={submitHandler}
            content={content}
            currentTabIndex={currentTabIndex}
            loading={loading}
            values={values}
          />
        </div>
      </div>
    </div>
  )
}

export default Builder
