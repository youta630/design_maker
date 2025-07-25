'use client';

export default function TestButton() {
  return (
    <button 
      onClick={() => {
        console.log('🔴 BASIC BUTTON CLICKED!!!');
        alert('ボタンが押されました！');
      }}
      style={{
        padding: '12px 24px',
        backgroundColor: 'red',
        color: 'white',
        fontSize: '18px',
        fontWeight: 'bold',
        border: 'none',
        cursor: 'pointer',
        zIndex: 9999,
        position: 'relative'
      }}
    >
      TEST BUTTON - CLICK ME
    </button>
  );
}