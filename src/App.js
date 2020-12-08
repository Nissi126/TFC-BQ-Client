import React, { Component } from 'react';
import {
  Navbar,
  NavbarBrand,
  Button
} from 'reactstrap';
import VolumeUpOutlinedIcon from '@material-ui/icons/VolumeUpOutlined';
import VolumeOffOutlinedIcon from '@material-ui/icons/VolumeOffOutlined';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Select from 'react-select';
import makeAnimated from 'react-select/animated';
import 'medium-editor/dist/css/medium-editor.css';
import 'medium-editor/dist/css/themes/default.css';
import './App.css';
import { fetchQuestion, fetchMaterial } from './webserviceCalls';

// Websocket server
// var server = 'http://127.0.0.1:8000/'
var server = 'https://tfc-web-socket.herokuapp.com'
const io = require('socket.io-client');
var user_room = prompt("Please enter your room #", "room");
var entered_username = prompt("Please enter your user name. E.G. 1-Jeff-Gnarwhals3.0", "Username");
var client = io.connect(server).emit('room', JSON.stringify({
  room: user_room,
  username: entered_username
}));

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      username: entered_username,
      jumper: null,
      q_text_to_display: "",
      question_reference: "",
      question_number: 0,
      i: 0,
      full_question_text: "",
      qm_full_question_text: "",
      answer_question_text: "🤔",
      room: user_room,
      play_audio: false,
      quizzers_in_room: [],
      quiz_started: false,
      selectedMaterial: {},
      leagueMaterial:{},
      league:"junior-quizzing"
    };
  }

  showMoreOpions = true;

  /* When content changes, we send the
current content of the editor to the server. */
  sync = (room_id) => {
    var {
      q_text_to_display,
      question_number,
      full_question_text,
      quiz_started
    } = this.state
    client.emit('contentchange', JSON.stringify({
      content: q_text_to_display,
      full_question_text: full_question_text,
      question_number: question_number,
      room: room_id,
      quiz_started: quiz_started
    }));
  };

  syncJump = (i, room_id, username) => {
    client.emit('jump', JSON.stringify({
      username: username,
      i: i,
      room: room_id
    }));
  };

  mute() {
    var audioOn = document.getElementById("audio-on");
    var audioOff = document.getElementById("audio-off");
    if(!this.state.play_audio){
      audioOn.style.display = "block";
      audioOff.style.display = "none";
    }else{
      audioOff.style.display = "block";
      audioOn.style.display = "none";
    }
    this.setState({ play_audio: !this.state.play_audio })
  }

  showMoreQuizOptions() {
    var showMore = document.getElementById("showMore");
    var showLess = document.getElementById("showLess");
    var moreQuizOptions = document.getElementById("moreQuizOptions");
    this.showMoreOpions=!this.showMoreOpions;
    if(this.showMoreOpions){
      showLess.style.display = "block";
      showMore.style.display = "none";
      moreQuizOptions.style.display = "block";
    }else{
      showMore.style.display = "block";
      showLess.style.display = "none";
      moreQuizOptions.style.display = "none";
    }
    this.showMoreQuizControls();
  }

  componentWillMount() {
    var session = this;
    console.log('session')
    console.log(session)
    if(session.state.username === 'QM'){
      this.getMaterial()
    }
    
    client.on('contentchange', function (message) {
      const dataFromServer = message
      const stateToChange = {};
      stateToChange.jumper = dataFromServer.jumper
      stateToChange.q_text_to_display = dataFromServer.question
      stateToChange.full_question_text = dataFromServer.full_question_text
      stateToChange.question_number = dataFromServer.question_number
      stateToChange.quiz_started = dataFromServer.quiz_started

      // Speaks the text aloud.
      if (session.state.play_audio === true) {
        try{
          var msg = new SpeechSynthesisUtterance();
          var voices = window.speechSynthesis.getVoices();
          msg.voice = voices[1]; // Note: some voices don't support altering params
          msg.voiceURI = 'native';
          msg.rate = 2.3; // 0.1 to 10
          var tts = dataFromServer.question.split(" ")
          msg.text = tts[tts.length - 2]
          msg.lang = 'en-US';
          speechSynthesis.speak(msg);
        }catch{
          alert("Audio does not work on this device.")
          this.mute();
          var audiobutton = document.getElementById("audioButton");
          audiobutton.disabled = true;
        }
      }

      session.setState({
        ...stateToChange
      });
    });

    client.on('jump', function (message) {
      const dataFromServer = message;
      const stateToChange = {};
      console.log('Jumper!')
      console.log(session.state.jumper)
      if (session.state.jumper == null) {
        stateToChange.jumper = dataFromServer.username
        console.log(stateToChange.jumper)
        stateToChange.i = dataFromServer.i;

        session.setState({
          ...stateToChange
        });
      }
    });

    client.on('joined', function (message) {
      console.log('Joined!')
      console.log(message)
      session.setState({ quizzers_in_room: message })
    });
  }

  startQuiz() {
    var {
      q_text_to_display,
      question_number,
      i,
      full_question_text,
      room,
    } = this.state
    this.question_array = full_question_text.split(" ")
    if (i < this.question_array.length) {
      q_text_to_display = q_text_to_display.concat(this.question_array[i]).concat(' ')
      i++
      this.setState({ q_text_to_display: q_text_to_display, i: i, question_number:question_number, full_question_text:full_question_text, quiz_started: true})
      this.sync(room)
    }
  }

  jump() {
    var {
      full_question_text,
      username,
      jumper,
      room
    } = this.state
    if (jumper == null) {
      this.question_array = full_question_text.split(" ")
      this.setState({ username: username })
      this.i = this.question_array.length
      this.syncJump(this.i, room, username)
    }
  }

  async nextQuestion() {
    this.setState({ jumper: null })
    var { question_number, league, selectedMaterial } = this.state
    var selectedBooksList = []
    var selectedCorrespondingChapters={}
    if (selectedMaterial !== {}) {
      for (const [key, value] of Object.entries(selectedMaterial)) {
        if(value.length > 0){
          var chaptersTemp=[]
          for(var i =0; i<value.length; i++){
            chaptersTemp.push(value[i].value)
          }
          selectedBooksList.push(key);
          selectedCorrespondingChapters[key]=chaptersTemp;
        }
      }
    }
    await fetchQuestion(selectedBooksList, selectedCorrespondingChapters, league)
      .then(res => res.json()).then((data) => {
        this.i = 0
        if (data != null) {
          console.log(data);
          console.log("Full quesiton from Database: ", data["Question"]);
          var fullQuestionTemp
          if(data["Question"].includes("[")){
            const removedORquestion = data["Question"].split(" [")
            fullQuestionTemp = data["Chapter"]+" verse "+data["Verse"]+" -"+removedORquestion[0]+"?";
          }else if(data["Chapter"]>20){
            fullQuestionTemp = data["Chapter"]+" verse "+data["Verse"]+" -"+data["Question"];
          }else{
            fullQuestionTemp = data["Chapter"]+":"+data["Verse"]+" -"+data["Question"];
          }
          this.setState({
            full_question_text: fullQuestionTemp,
            qm_full_question_text: data["Chapter"]+":"+data["Verse"]+" -"+data["Question"],
            question_reference: data["Reference Text"],
            answer_question_text: data["Answer"],
            q_text_to_display: " ",
            question_number: question_number+1,
            i: this.i
          })
        } else {
          this.setState({
            q_text_to_display: "*** No question found for selected criteria :/ ***",
            full_question_text: "*** No question found for selected criteria :/ ***"
          })
        }
        if (!this.state.quiz_started) {
          setInterval(() => this.startQuiz(), 1000);
        }
      });
  }

  updateSelectedMaterial =(book, chapters) =>{
    var { selectedMaterial } = this.state
    var newSelectedMaterial = {}
    if(Object.keys(selectedMaterial).length === 0){
      newSelectedMaterial[book.key]=chapters
    }else if(!selectedMaterial.hasOwnProperty(book.key)){
      newSelectedMaterial=selectedMaterial
      newSelectedMaterial[book.key]=chapters
    }else{
      for (const [key, value] of Object.entries(selectedMaterial)) {
        if(key === book.key){
          newSelectedMaterial[book.key]=chapters
        }else{
          newSelectedMaterial[key]=value
        }
      }
    }
    this.setState({ selectedMaterial: newSelectedMaterial})
  }

  async getMaterial() {
    await fetchMaterial(this.state.league)
      .then(res => res.json()).then((data) => {
        this.setState({ leagueMaterial: data})
      });
  }

  showMoreQuizControls = () => {
    var { leagueMaterial } = this.state
    const animatedComponents = makeAnimated();
    var booksAndChaptersDIV = <div></div>
    for (const [key, value] of Object.entries(leagueMaterial)) {
      var i;
      var chapters = []
      for (i = 0; i < value.length; i++) {
        chapters.push({value: value[i], label: value[i]});
      }
      var bookMaterialDiv = <div>
        <label htmlFor="questionChaptersLabel">Choose Chapters for {key}:</label>
        <Select
          isMulti
          closeMenuOnSelect={false}
          components={animatedComponents}
          name="questionchapters"
          options={chapters}
          onChange={(e) => this.updateSelectedMaterial({key},e)}
          className="basic-multi-select"
          classNamePrefix="select"
        />
      </div>
      booksAndChaptersDIV= <div>{booksAndChaptersDIV} {bookMaterialDiv}</div>
    }
    return booksAndChaptersDIV
  }

  showQuizMasterSection = () => {
    var { username, qm_full_question_text, answer_question_text, question_reference } = this.state
    if (username === 'QM') {
      return (
        <div className="quiz_master_content">
          <h4 className="quizMasterBody"><b>Full Question:</b> {qm_full_question_text}</h4>
          <h4 className="quizMasterBody"><b>Answer:</b> {answer_question_text}</h4>
          <h4 className="quizMasterBody"><b>Full Verse:</b> {question_reference}</h4>
          <h6 className="quizMasterBody wrap_around"><b>Quizzers in room:</b> {this.state.quizzers_in_room.join(', ')}</h6>
          <div className="flex">
            <Button id="showMoreButton" onClick={() => this.showMoreQuizOptions()}>
              <ExpandLessIcon id="showLess"/>
              <ExpandMoreIcon id="showMore" style={{display:'none'}}/>
            </Button>
            <h6>More Quiz Options</h6>
          </div>
          <div id="moreQuizOptions" className="flex">
            <this.showMoreQuizControls></this.showMoreQuizControls>
          </div>
        </div>
      )
    }
    return ""
  }

  footerButtons = () => {
    var { username } = this.state
    if (username === 'QM') {
      let startQuizORnextQuestion = <div id="practiceQuiz" className="footerButton"><Button onClick={() => this.nextQuestion()}><h3>Next Question</h3></Button>{' '}</div>
      if(!this.state.quiz_started){
        startQuizORnextQuestion = <div className="footerButton"><Button onClick={() => setInterval(() => this.startQuiz(), 1000)}><h2>Start Quiz</h2></Button></div>
      }
      return (
        <div id="realQuiz">
          {startQuizORnextQuestion}{' '}
        </div>
      )
    }else{
      return (
        <div className="footerButton">
          <Button onClick={() => this.jump()}><h2>Jump</h2></Button>
        </div>
      )
    }
  }

  render() {
    const {
      q_text_to_display,
      question_number,
      room,
      username,
      quiz_started,
      jumper
    } = this.state;
    let quizzerQuestionInformation;
    let quizzerQuestion=<h2>{q_text_to_display}</h2>
    if(question_number>0){
      quizzerQuestionInformation = <h4 className="question_information">Question #{question_number} from the book of Matthew.</h4>
    }else{
      quizzerQuestion=<h2><span role="img" aria-label="eyes">👀</span> Watch for the question to appear here. <span role="img" aria-label="eyes">👀</span></h2>
      quizzerQuestionInformation = <h4 className="question_information">Quiz Master has not started the quiz.</h4>
      if(quiz_started){
        quizzerQuestionInformation = <h4 className="question_information">Welcome to the Quiz!</h4>
      }
    }
    let jumpTemp;
    if(jumper !== "" && jumper!== null && typeof jumper !== "undefined"){
      jumpTemp= <div><h3 className="jump_in_page_alert"><b>{jumper}</b> has won the Jump!</h3></div>
    }
    return (
      <React.Fragment>
        <Navbar color="light" light>
          <span className="wrap_around">Welcome <b>{username}</b> to room <b>{room}</b>! </span>
          <NavbarBrand href="/">Bible Quiz 2.0</NavbarBrand>
        </Navbar>
        {jumpTemp}
        <div className="flex" style={{'justifyContent': 'center'}}>
          <div>
            <Button id="audioButton" onClick={() => this.mute()}>
              <VolumeUpOutlinedIcon id="audio-on" style={{display:'none'}}/>
              <VolumeOffOutlinedIcon id="audio-off"/>
            </Button>
          </div>
          {quizzerQuestionInformation}
        </div>
        <div className="question">
          <div>
            {quizzerQuestion}
          </div>
        </div>
        <br></br>
        <div className="container-fluid">
          <this.showQuizMasterSection></this.showQuizMasterSection>
        </div>
        <this.footerButtons></this.footerButtons>
        <div style={{height:"60px"}}></div>{/* To enable the page to scroll and show all content due to footer buttons */}
      </React.Fragment>
    )
  }
}

export default App;
