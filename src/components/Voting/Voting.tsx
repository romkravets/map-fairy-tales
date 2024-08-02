import React from 'react';

interface VotingProps {
  regionData: {
    region: string;
    votes?: number[];
    value?: number;
  };
  setRegionData: (data: { region: string; votes: number[]; value: number }) => void;
  setCheckIfSetValue: (value: boolean) => void;
  btnVotingActive: number | null;
  setBtnVotingActive: (value: number) => void;
  valuesBtnVoting: {
    one: number;
    two: number;
    three: number;
  };
}

const Voting: React.FC<VotingProps> = ({
                                         regionData,
                                         setRegionData,
                                         setCheckIfSetValue,
                                         btnVotingActive,
                                         setBtnVotingActive,
                                         valuesBtnVoting
                                       }) => {
  const setValueData = (valueToAdd: number) => {
    const updatedRegionData = { ...regionData };
    if (!updatedRegionData.votes) {
      updatedRegionData.votes = [];
    }
    updatedRegionData.votes.push(valueToAdd);

    const totalVotes = updatedRegionData.votes.length;
    const sumVotes = updatedRegionData.votes.reduce((sum, vote) => sum + vote, 0);
    console.log(totalVotes, 'totalVotes')
    console.log(sumVotes, 'sumVotes')
    updatedRegionData.value = sumVotes / totalVotes;
    setRegionData(updatedRegionData as { region: string; votes: number[]; value: number });
    setCheckIfSetValue(false);
  };

  const handleButtonClick = (valueToAdd: number) => {
    setValueData(valueToAdd);
    setBtnVotingActive(valueToAdd);
  };

  return (
    <main className="votingName">
      <button
        className={`btn ${btnVotingActive === valuesBtnVoting.one ? 'active' : ''}`}
        onClick={() => handleButtonClick(valuesBtnVoting.one)}
      >
        Підари
      </button>
      <button
        className={`btn ${btnVotingActive === valuesBtnVoting.two ? 'active' : ''}`}
        onClick={() => handleButtonClick(valuesBtnVoting.two)}
      >
        Норм
      </button>
      <button
        className={`btn ${btnVotingActive === valuesBtnVoting.three ? 'active' : ''}`}
        onClick={() => handleButtonClick(valuesBtnVoting.three)}
      >
        Хороші
      </button>
    </main>
  );
};

export default Voting;
