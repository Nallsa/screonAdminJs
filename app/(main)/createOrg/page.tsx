'use client'

import { useState } from 'react';
import { useRouter } from 'next/router';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Container from 'react-bootstrap/Container';
import axios from "axios";
import {PlaylistItem} from "@/public/types/interfaces";

export default function CreateOrgPage() {
    const [orgName, setOrgName] = useState('');

    const handleSave =async () => {
        console.log('Сохраняем организацию:', orgName);
        // здесь можешь добавить вызов API или редирект
        const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;

        const response = await axios.post(`${SERVER_URL}organizations`, {
            name: orgName,
        })

        const result: any = response.data

        console.log(result)
    };

    return (
        <Container style={{ paddingTop: '50px' }}>
            <h1>Создать организацию</h1>
            <Form>
                <Form.Group controlId="orgName">
                    <Form.Label>Название организации</Form.Label>
                    <Form.Control
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="Введите название"
                    />
                </Form.Group>
                <Button variant="primary" onClick={handleSave} className="mt-3">
                    Сохранить
                </Button>
            </Form>
        </Container>
    );
}

