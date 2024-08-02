
const CardBtns = ({title, dataInput, setDataInput, setOpenModal, isDisabled}) => {
  return (
    <div className="stepper-footer form-btn-block">
      <button
        type="button"
        className="btn-transparent"
        onClick={(e) => {
          e.preventDefault()
          setDataInput(null)
          setOpenModal(false)
        }}
      >
        Cancel
      </button>
      <button
        className="btn btn-continue"
        type="submit"
        disabled={isDisabled}
      >
        {dataInput?.editing ? 'Edit' : title}
      </button>
    </div>
  )
}

export default CardBtns