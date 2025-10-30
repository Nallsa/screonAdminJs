'use client'
import React, {useState} from "react";
import Dropdown from "react-bootstrap/Dropdown";

type DropDownSelectProps = {
    quantityScreens: number;
    handleSelectQuant: (eventKey: string | null) => void;
};

export default function DropDownSelect({quantityScreens, handleSelectQuant}: DropDownSelectProps) {
    return (
        <Dropdown onSelect={handleSelectQuant}>
            <Dropdown.Toggle variant="primary">Кол-во {quantityScreens}</Dropdown.Toggle>
            <Dropdown.Menu>
                {[1, 2, 4].map((n) => (
                    <Dropdown.Item key={n} eventKey={String(n)} active={quantityScreens === n}>
                        {n}
                    </Dropdown.Item>
                ))}
            </Dropdown.Menu>
        </Dropdown>
    );
}