exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Test function works!',
      path: event.path,
      method: event.httpMethod
    })
  };
};
