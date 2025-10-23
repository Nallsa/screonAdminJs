import {useState} from "react";
import {Card, Dropdown} from "react-bootstrap";
import DropDownSelect from "@/app/components/Schedule/Settings/ScreenSelection/DropDownSelect";
import SplitScreen from "@/app/components/Schedule/Settings/ScreenSelection/SplitScreen";


export default function ScreenSelection() {
    const [quantityScreens, setQuantityScreens] = useState<number>(1);

    const handleSelectQuant = (eventKey: string | null) => {
        if (eventKey !== null) setQuantityScreens(Number(eventKey));
    };

    return (
        <Card>
            <Card.Header className="border-top">Разделение экрана</Card.Header>
            <Card.Body>
                <div className="d-flex flex-column gap-3 align-items-start">
                    <DropDownSelect
                        handleSelectQuant={handleSelectQuant}
                        quantityScreens={quantityScreens}
                    />
                    <SplitScreen count={(quantityScreens as 1 | 2 | 4) ?? 1}/>
                </div>
            </Card.Body>
        </Card>
    );
}
