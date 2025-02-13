function findMaxSerialNameCount(arr, key1) {
  let maxCount = 0;
  let currentName = null;
  let currentCount = 0;

  for (let i = 0; i < arr.length; i++) {
    const currentObject = arr[i];
    const currentObjectName = currentObject[key1];

    if (currentObjectName === currentName) {
      currentCount++;
    } else {
      currentName = currentObjectName;
      currentCount = 1;
    }

    if (currentCount > maxCount) {
      maxCount = currentCount;
    }
  }

  return maxCount;
}

module.exports = { findMax: findMaxSerialNameCount };
