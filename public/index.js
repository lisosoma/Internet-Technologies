const API_URL = 'http://localhost:4320';

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});

class AppModel {
  static async getTasklists() {
    const tasklistsRes = await fetch(`${API_URL}/tasklists`);
    return await tasklistsRes.json();
  }

  static async addTasklist(tasklistName, city, time, counter) {
    const result = await fetch(
        `${API_URL}/tasklists`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ tasklistName, city, time, counter })
        }
    );

    const resultData = await result.json();

    return result.status === 200
        ? resultData
        : Promise.reject(resultData);
  }

  static async addTask({
                         tasklistId,
                         taskName
                       }) {
    const result = await fetch(
        `${API_URL}/tasklists/${tasklistId}/tasks`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ taskName })
        }
    );

    const resultData = await result.json();

    return result.status === 200
        ? resultData
        : Promise.reject(resultData);
  }

  static async editTask({
                          tasklistId,
                          taskId,
                          newTaskName
                        }) {
    const result = await fetch(
        `${API_URL}/tasklists/${tasklistId}/tasks/${taskId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ newTaskName })
        }
    );

    const resultData = await result.json();

    return result.status === 200
        ? resultData
        : Promise.reject(resultData);
  }

  static async deleteTask({
                            tasklistId,
                            taskId
                          }) {
    const result = await fetch(
        `${API_URL}/tasklists/${tasklistId}/tasks/${taskId}`,
        {
          method: 'DELETE'
        }
    );

    const resultData = await result.json();

    return result.status === 200
        ? resultData
        : Promise.reject(resultData);
  }
}

class App {
  constructor() {
    this.tasklists = [];
  }

  createTaskList = async () => {
    const nameInput = document.getElementById('name-input');
    const cityInput = document.getElementById('city-input');
    const timeInput = document.getElementById('time-input');
    const counterInput = document.getElementById('counter-input');

    const name = nameInput.value;
    const city = cityInput.value;
    const time = timeInput.value;
    const counter = counterInput.value;

    nameInput.value = '';
    cityInput.value = '';
    timeInput.value = '';
    counterInput.value = '';


    await AppModel.addTasklist(name, city, time, counter);

    const newTaskList = new Tasklist({
      tlName: name,
      tlCity: city,
      tlTime: time,
      tlCounter: counter,
      tlID: `TL${this.tasklists.length}`,
      tlTasks: [],
    });
    this.tasklists.push(newTaskList);
    this.tasklists.sort((a, b) => {
      const splitA = a.tlTime.split(':');
      const splitB = b.tlTime.split(':');
      return (Number(splitA[0]) * 60 + Number(splitA[1])) - (Number(splitB[0]) * 60 + Number(splitB[1]));
    });
    this.reRenderTasklists();
  };

  async init() {
    const tasklists = await AppModel.getTasklists();
    tasklists.forEach(({ tasklistName, city, time, counter, tasks }) => {
      const newTasklist = new Tasklist({
        tlName: tasklistName,
        tlCity: city,
        tlTime: time,
        tlCounter: counter,
        tlID: `TL${this.tasklists.length}`,
        tasks: tasks.slice(),
      });

      this.tasklists.push(newTasklist);
    });
    this.tasklists.sort((a, b) => {
      const splitA = a.tlTime.split(':');
      const splitB = b.tlTime.split(':');
      return (Number(splitA[0]) * 60 + Number(splitA[1])) - (Number(splitB[0]) * 60 + Number(splitB[1]));
    });
    this.reRenderTasklists();

    document.getElementById('tm-tasklist-add-tasklist')
        .addEventListener(
            'click',
            (event) => {
              this.createTaskList();
            }
        );

    document.querySelector('.toggle-switch input')
        .addEventListener(
            'change',
            ({ target: { checked } }) => {
              checked
                  ? document.body.classList.add('dark-theme')
                  : document.body.classList.remove('dark-theme');
            }
        );
  }

  reRenderTasklists() {
    const tasksElements = document.querySelectorAll('main .deletable-tasklist');
    tasksElements.forEach((element) => element.remove())

    this.tasklists.forEach((tasklist) => {
      tasklist.render();
      tasklist.rerenderTasks();
    })
  }
}

class Tasklist {
  constructor({
                tlName,
                tlCity,
                tlTime,
                tlCounter,
                tlID,
                tasks,
              }) {
    this.tlName = tlName;
    this.tlCity = tlCity;
    this.tlTime = tlTime;
    this.tasks = tasks || [];
    this.tlMaxCounter = tlCounter;
    this.tlCounter = tlCounter - this.tasks.length;
    this.tlID = tlID;
  }

  onAddTaskButtonClick = async () => {
    const newTaskName = prompt('Введите фамилию:');

    if (!newTaskName) return;

    const tasklistId = Number(this.tlID.split('TL')[1]);
    try {
      await AppModel.addTask({
        tasklistId,
        taskName: newTaskName
      });
      this.addTask(newTaskName);
    } catch (error) {
      console.error('ERROR', error);
    }
  };

  addTask = (taskName) => {
    document.querySelector(`#${this.tlID} ul`)
        .appendChild(
            this.renderTask({
              taskID: `${this.tlID}-T${this.tasks.length}`,
              taskName
            })
        );

    this.tasks.push(taskName);
    this.tlCounter = this.tlMaxCounter - this.tasks.length;
    this.rerenderCounter();
  };

  onDeleteTaskButtonClick = async (taskID) => {
    const taskIndex = Number(taskID.split('-T')[1]);
    const taskName = this.tasks[taskIndex];

    if (!confirm(`Задача '${taskName}' будет удалена. Продолжить?`))
      return;

    const tasklistId = Number(this.tlID.split('TL')[1]);
    try {
      await AppModel.deleteTask({
        tasklistId,
        taskId: taskIndex
      });

      this.deleteTask(taskIndex);
    } catch (error) {
      console.error('ERROR', error);
    }
  };

  deleteTask = (taskIndex) => {
    this.tasks.splice(taskIndex, 1);
    this.tlCounter += 1;
    this.rerenderCounter();
    this.rerenderTasks();
  };

  onEditTask = async (taskID) => {
    const taskIndex = Number(taskID.split('-T')[1]);
    const oldTaskName = this.tasks[taskIndex];

    const newTaskName = prompt('Введите новое описание задачи', oldTaskName);

    if (!newTaskName || newTaskName === oldTaskName) {
      return;
    }

    const tasklistId = Number(this.tlID.split('TL')[1]);
    try {
      await AppModel.editTask({
        tasklistId,
        taskId: taskIndex,
        newTaskName
      });

      this.tasks[taskIndex] = newTaskName;
      document.querySelector(`#${taskID} span`)
          .innerHTML = newTaskName;
    } catch (error) {
      console.error('ERROR', error);
    }
  };

  rerenderTasks = () => {
    const tasklist = document.querySelector(`#${this.tlID} ul`);
    tasklist.innerHTML = '';

    this.tasks.forEach((taskName, taskIndex) => {
      tasklist.appendChild(
          this.renderTask({
            taskID: `${this.tlID}-T${taskIndex}`,
            taskName
          })
      );
    });
  };

  renderTask = ({ taskID, taskName }) => {
    const task = document.createElement('li');
    task.classList.add('tm-tasklist-task');
    task.id = taskID;

    const span = document.createElement('span');
    span.classList.add('tm-tasklist-task-text');
    span.innerHTML = taskName;
    task.appendChild(span);

    const controls = document.createElement('div');
    controls.classList.add('tm-tasklist-task-controls');

    const upperRow = document.createElement('div');
    upperRow.classList.add('tm-tasklist-task-controls-row');

    controls.appendChild(upperRow);

    const lowerRow = document.createElement('div');
    lowerRow.classList.add('tm-tasklist-task-controls-row');

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.classList.add(
        'tm-tasklist-task-controls-button',
        'edit-icon'
    );
    editButton.addEventListener('click', () => this.onEditTask(taskID));
    lowerRow.appendChild(editButton);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.classList.add(
        'tm-tasklist-task-controls-button',
        'delete-icon'
    );
    deleteButton.addEventListener('click', () => this.onDeleteTaskButtonClick(taskID));
    lowerRow.appendChild(deleteButton);

    controls.appendChild(lowerRow);

    task.appendChild(controls);

    return task;
  };

  render() {
    const tasklist = document.createElement('div');
    tasklist.classList.add('tm-tasklist', 'deletable-tasklist');
    tasklist.id = this.tlID;

    const header = document.createElement('header');
    header.classList.add('tm-tasklist-header');
    header.innerHTML = this.tlName;
    tasklist.appendChild(header);

    const city = document.createElement('div');
    city.classList.add('tm-tasklist-description');
    city.innerHTML = this.tlCity;
    tasklist.appendChild(city);

    const time = document.createElement('div');
    time.classList.add('tm-tasklist-description');
    time.innerHTML = this.tlTime;
    tasklist.appendChild(time);

    const counter = document.createElement('div');
    counter.classList.add('tm-tasklist-description');
    counter.classList.add('counter-info');
    counter.innerHTML = `Мест осталось: ${this.tlCounter}`;
    tasklist.appendChild(counter);

    const list = document.createElement('ul');
    list.classList.add('tm-tasklist-tasks');
    tasklist.appendChild(list);

    const footer = document.createElement('footer');
    const button = document.createElement('button');
    button.type = 'button';
    button.classList.add('tm-tasklist-add-task');
    button.innerHTML = 'Забронировать билет';
    if (this.tlCounter <= 0)
      button.setAttribute('disabled', '');
    button.addEventListener('click', this.onAddTaskButtonClick);
    footer.appendChild(button);
    tasklist.appendChild(footer);

    const container = document.querySelector('main');
    container.insertBefore(tasklist, container.lastElementChild);
  }

  rerenderCounter() {
    const thisTasksList = document.getElementById(this.tlID);
    const counterElem = thisTasksList.querySelector('.counter-info');
    counterElem.innerHTML = 'Мест осталось: ' + this.tlCounter;

    const button = thisTasksList.querySelector('.tm-tasklist-add-task');
    if (this.tlCounter <= 0) {
      button.setAttribute("disabled", "");
    } else {
      button.removeAttribute("disabled");
    }
  }
}