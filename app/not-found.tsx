import 'bootstrap/dist/css/bootstrap.min.css';
import "@/public/css/styles.css"

export default function NotFoundPage(){
    return(
        <main>
        <div className="container" style={{height:500, display: "flex", alignItems: "center", justifyContent: "center"}}>
            <h1>Страница не найдена</h1>
        </div>
        </main>
    )
}

