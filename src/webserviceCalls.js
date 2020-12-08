const fetchQuestion = (books, chapters,league) => { 
  var query='http://localhost:5000/filtered?league='+league+'&books='+books
  for (const [key, value] of Object.entries(chapters)) {
    query =query +'&'+key+'='+value
  }
  return fetch(query)
  // return fetch(query)
}

const fetchMaterial = (league) => {
  return fetch('https://tfc-quizzing-api.herokuapp.com/material?league='+league)
  // return fetch('http://localhost:5000/material?league='+league)
}

export { fetchQuestion, fetchMaterial } 