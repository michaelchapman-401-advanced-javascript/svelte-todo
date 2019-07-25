<script>
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();

  export let todo;

  function handleCompleted(e) {
    dispatch('completed', {
      id: e.target.value
    });
  }
</script>

<style>
  .card {
    background-color: rgb(48, 109, 73);
    height: 125px;
    width: 350px;
    margin-left: 35%;
  }

  #todo {
    width: 100%;
  }
</style>

<section id="todo">
  {#each todo as item, i}
    <div name={item.name} class="card">
      <h3>{item.name}</h3>
      <p>{item.description}</p>
      <button value={item.id} on:click|preventDefault={handleCompleted}>Complete</button>
    </div>
  {/each}
</section>
