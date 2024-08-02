import { FC, ReactNode } from 'react';

interface ModalProps {
  children: ReactNode;
}

const Modal: FC<ModalProps> = ({ children }) => {

  return (
    <section
      className="modal justify-center items-center bg-[#667] opacity-90 flex overflow-x-hidden overflow-y-auto fixed inset-0 z-50 outline-none focus:outline-none px-4">
      <div>
        <div>{children}</div>
      </div>
    </section>
  )
}

export default Modal
