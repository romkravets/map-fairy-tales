import { toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.min.css"
import { helperTextColor, primaryColor, primaryFont } from "@/src/helpers/variables/variables"

export const notifyApp = (content: string, type: string) => {
  const defaultOptions = {
    position: toast.POSITION.BOTTOM_RIGHT,
    autoClose: 2000,
  }
  switch (type) {
    case 'success':
      toast.success(
        content,
        {
          ...defaultOptions,
          style: {
            fontFamily: primaryFont,
            color: helperTextColor,
            fontSize: '0.75rem',
            borderRadius: '14px'
          },
          progressStyle: {
            backgroundColor: primaryColor
          }
        }
      )
      break
    default: break
  }
}
