import { FC, ReactNode } from 'react';

interface QuestLayoutProps {
  children: ReactNode;
}


const QuestLayout:FC<QuestLayoutProps> = ({children}) => {
  return (
    <div style={{width: '100%', height: '100vh'}}>
      {children}
    </div>
  )
}

export default QuestLayout
