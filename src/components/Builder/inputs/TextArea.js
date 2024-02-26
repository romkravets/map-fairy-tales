const TextArea = ({handleChange, handleBlur, labelClassName, label, inputLimit, error, ...otherProps}) => {

  return (
    <div className="form-row">
      {label && (
        <label className="label" htmlFor={label}>
          {label}
        </label>
      )}
      <textarea
        id={label}
        className="form-textarea"
        onChange={(e) => {
          handleChange(e);
        }}
        maxLength={inputLimit}
        onBlur={handleBlur}
        {...otherProps}
      />
    </div>
  );
}

export default TextArea
