const taskInuput = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const taskList = document.getElementById("taskList");

async function loadtasks() {
  try {
    // you get all the info from the database and wait for it
    const response = await fetch("/tasks");
    // now after getting the tasks from the database now convert it into the array
    const tasks = await response.json();
    // erase the that is previously present on the screen
    taskList.innerHTML = "";
    // this will render each and every task
    tasks.forEach((task) => rendertask(task));
  } catch (error) {
    console.log("NO task in The history", error);
  }
}
// it is used to show each and every task in the screen one by one
function rendertask(task) {
  // create new li tag to add the task in the screen
  const li = document.createElement("li");
  //   given class
  li.className = "task-item";
  // given id to it unique id each has
  li.id = `task-${task.id}`;
  //  create the span tag
  const span = document.createElement("span");
  // given the class
  span.className = "task-text";
  // now diffining what will the content of the span
  span.textContent = task.title;
  // add completed css if is task is completed=1
  span.classList.toggle("completed", task.is_completed);
  // now create new button for each
  const donebtn = document.createElement("button");
  // if button crreate add the class list
  donebtn.className = "btn-done";
  // in this you add the text in the button
  donebtn.textContent = task.is_completed ? "Undo" : "done";
  //if done btn is clicked
  donebtn.addEventListener("click", async () => {
    // we check the new status is it undo or done operation to performm
    const newstatus = !task.is_completed;
    // try to fetch the data and get the response
    try {
      const response = await fetch(`/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_completed: newstatus }),
      });

      if (!response.ok) {
        const err = await response.json();
        console.error("task is not updated", err);
        return;
      }
      // now the id you fectch
      const updatetask = await response.json();
      // if the task is completed update it
      task.is_completed = updatetask.is_completed;
      // add class list
      span.classList.toggle("completed", task.is_completed);
      donebtn.textContent = task.is_completed ? "Undo" : "done";
    } catch (error) {
      console.log("task is not updated", error);
    }
  });
  //   create delete btn
  const deletebtn = document.createElement("button");
  deletebtn.className = "btn-delete";
  deletebtn.textContent = "delete";
  deletebtn.addEventListener("click", async () => {
    try {
      const response = await fetch(`/tasks/${task.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        li.remove();
      }
    } catch (error) {
      console.log("sorry no content to delete", error);
    }
  });
  li.appendChild(span);
  li.appendChild(donebtn);
  li.appendChild(deletebtn);
  taskList.appendChild(li);
}

// we are addinng the event;listener on add button so when user click it will work
addBtn.addEventListener("click", async () => {
  // if the title is given then dd the trim in this
  const title = taskInuput.value.trim();
  //   if the task get empty after triming maybe user not send the task or send the blank space
  if (!title) {
    alert("please write the task");
    return;
  }
  //  if the task is not empty then proceed fetch the tasks fetch defaulty work on get that why we need to define the post method tha we are sending some amount of the data
  try {
    const response = await fetch("/tasks", {
      method: "POST",
      //   we are diffing the format of the data that is used
      headers: {
        "Content-Type": "application/json",
      },
      //   it convert the object into the string
      body: JSON.stringify({ title: title }),
    });
    // the data that is store in database now send the information of the new data in form of the array
    const newTask = await response.json();
    // it will render that task into the frontend
    rendertask(newTask);
    // now the title get empty
    taskInuput.value = "";
  } catch (error) {
    console.error("error occur in addig the task", error);
  }
});
loadtasks();
