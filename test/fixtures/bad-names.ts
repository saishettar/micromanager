function loopExample() {
  for (let i = 0; i < 10; i++) {
    console.log(i);
  }
}

function processData() {
  let data = { value: 1 };
  let data2 = { value: 2 };
  let dataFinal = { value: 3 };
  let dataFinalFinal = { value: 4 };

  let x = 42;
  let temp = 'scratch';

  const my_variable = 1;
  const myVariable = 2;

  return { data, data2, dataFinal, dataFinalFinal, x, temp, my_variable, myVariable };
}

function topLevelSingleLetter() {
  let i = 99;
  return i;
}
