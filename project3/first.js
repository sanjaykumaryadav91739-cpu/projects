// const root=document.querySelector('root');
// root.addEventListener('click',()=>{

// })

// const button = document.querySelector('button');

// function handle(){
//     button.textContent = "Clicked";
//     button.removeEventListener('click',handle);
// }



// button.addEventListener('click',handle);
const buttons = document.querySelectorAll("button");

buttons.forEach(button => {
    button.addEventListener("click", () => {
        const color = getComputedStyle(button).backgroundColor;
        document.body.style.backgroundColor = color;
    });
});