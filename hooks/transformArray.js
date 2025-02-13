function transformArray(inputArray) {
  // Create an object to store counts for each name
  const counts = {};

  // Iterate through the input array
  inputArray.forEach((item) => {
    const { name } = item;

    // If the name is not in the counts object, initialize it to 1
    if (!counts[name]) {
      counts[name] = 1;
    } else {
      // If the name is already in the counts object, increment the count
      counts[name]++;
    }
  });

  // Create the final result array
  const resultArray = Object.keys(counts).map((name) => ({
    name,
    bookedCount: counts[name],
  }));

  return resultArray;
}

module.exports = transformArray;
