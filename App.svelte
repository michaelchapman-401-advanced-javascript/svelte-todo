<script>
  import Todo from "./todo.svelte";
  import Completed from "./completed.svelte";

  let name = '';
  let description = '';
  let todo = [];
  let completed = [];

  function Item() {
    this.id = todo.length;
    this.name = name;
    this.description = description;
  }

  let addTask = (e) => {
    let item = new Item();
    
    todo = [...todo, item];
  }

  function markComplete(e) {
    let item;
    for (let i = 0; i < todo.length; i++) {
      if (todo[i].id === Number(e.detail.id)) {
        item = todo[i];
        console.log('item', item);
        todo.splice(i, 1);
      }
    }

    todo = [...todo];
    completed = [...completed, item];
  }
</script>

<style>
  main {
    font-family: sans-serif;
    text-align: center;
  }
</style>

<main>
  <form on:submit|preventDefault={addTask}>
    <input value=name type=text bind:value={name}>
    <input value=description type=text bind:value={description}>
    <button type=submit>Add Task</button>
  </form>
  <h3>ToDo</h3>
	<Todo 
    todo={todo} 
    on:completed={markComplete} 
  />
  <hr />
  <h3>Completed</h3>
  <Completed completed={completed} />
</main>
