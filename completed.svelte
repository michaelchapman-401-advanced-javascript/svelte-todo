<script>
  export let completed;
</script>

<style>
  .cardComplete {
    background-color: rgb(143, 31, 31);
    height: 125px;
    width: 350px;
    margin-left: 35%;
  }

  #todo {
    width: 100%;
  }
</style>

<section id="todo">
  {#each completed as item, i}
    <div class="cardComplete">
      <p>{item.name}</p>
      <p>{item.description}</p>
    </div>
  {/each}
</section>