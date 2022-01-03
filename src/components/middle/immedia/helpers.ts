const formatRoom = (room: string) => room.replace('-', 's');

const definedRoom = () => {
  if (process.env.IMMEDIA_ROOM_ID === '') {
    // eslint-disable-next-line no-console
    console.error('IMMEDIA_ROOM_ID is not defined in the .env file.');
  }
};

definedRoom();

export { formatRoom };
