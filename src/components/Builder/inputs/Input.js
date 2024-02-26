const Input = ({ handleChange, handleBlur, label, labelClassName, error, ...otherProps }) => {

  return (
    <div className="form-row">
      {label && <
        label className="label"
              htmlFor={label}>{label}
        {otherProps.require && <span className="asterisk">*</span>}</label>}
      <input
        id={label}
        className={`form-input ` + (error && `error-border`)}
        onChange={(e) => {
          handleChange(e)
        }}
        onBlur={handleBlur}
        {...otherProps}
      />
    </div>
  )
}

export default Input
