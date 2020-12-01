export const fetchQuestion = (books, chapters) => {  
  // return ({
  //   book: "Mattew", 
  //   chapter: "1", 
  //   verse: "2", 
  //   question: "Who was the father (of Isaac)?", 
  //   answer: "Abraham OR Isaac OR Jacob", 
  //   reference: "Abraham was the father of Isaac, and Isaac the father of Jacob, and Jacob the father of Judah and his brothers,", 
  // })
  return fetch('https://tfc-quizzing-api.herokuapp.com/filtered?books='+books+'&chapters='+chapters)
  // return fetch('http://localhost:5000/filtered?books='+books+'&chapters='+chapters)
}
