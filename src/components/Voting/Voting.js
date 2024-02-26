export default function Voting({regionData, setRegionData, setCheckIfSetValue, btnVotingActive, setBtnVotingActive, valuesBtnVoting}) {

  const setValueData = (valueToAdd) => {
    const updatedRegionData = {...regionData};
    updatedRegionData.value = valueToAdd;
    console.log(updatedRegionData);
    setRegionData(updatedRegionData);
    setCheckIfSetValue(false);
  }

  const handleButtonClick = (valueToAdd) => {
    setValueData(valueToAdd)
    setBtnVotingActive(valueToAdd)
  }

  return (
    <main className="votingName">
      <button
        className={`btn ${btnVotingActive === valuesBtnVoting.one ? 'active' : ''}`}
        onClick={() => handleButtonClick(valuesBtnVoting.one)}
      >
        Не дуже
      </button>
      <button
        className={`btn ${btnVotingActive === valuesBtnVoting.two ? 'active' : ''}`}
        onClick={() => handleButtonClick(valuesBtnVoting.two)}
      >
        Середній
      </button>
      <button
        className={`btn ${btnVotingActive === valuesBtnVoting.three ? 'active' : ''}`}
        onClick={() => handleButtonClick(valuesBtnVoting.three)}
      >
        Супер!
      </button>
    </main>
  );
}
