
export default function Voting({regionData, setRegionData, getFormApp, setCheckIfSetValue}) {
  let setValueData = (valueToUpdate) => {
    const updatedRegionData = { ...regionData };
    updatedRegionData.value = {
      0: 0,
      1: 0,
      2: 0
    };

    updatedRegionData.value = {
      ...updatedRegionData.value,
      ...valueToUpdate
    };
    setRegionData(updatedRegionData);
    setCheckIfSetValue(false)
  };

  return (
    <main className="voutingName">
      <button onClick={() => {
        setValueData( {0: 1});
      }}>0</button>
      <button onClick={() => {
        setValueData( {1: 1});
      }}>1</button>
      <button onClick={() => {
        setValueData( {2: 1});
      }}>2</button>
    </main>
  );
}
