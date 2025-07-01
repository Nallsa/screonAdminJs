'use client'

import {useState} from 'react';
import {useRouter} from 'next/navigation'
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Container from 'react-bootstrap/Container';
import axios from "axios";
import {PlaylistItem} from "@/public/types/interfaces";
import {addValueInStorage, getValueInStorage} from "@/app/API/localStorage";
import {Col, Row} from "react-bootstrap";

export default function CreateOrgPage() {
    const [orgName, setOrgName] = useState('');
    const router = useRouter()

    const handleSave = async () => {
        console.log('Сохраняем организацию:', orgName);
        // здесь можешь добавить вызов API или редирект
        const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;
        const accessToken = getValueInStorage("accessToken");
        const userId = getValueInStorage("userId");
        console.log('accessToken', accessToken);


        const response = await axios.post(
            `${SERVER_URL}organizations`,
            {name: orgName, creatorUserId: userId},
            {headers: {Authorization: `Bearer ${accessToken}`}}
        );

        const result: any = response.data


        if (response.status === 200) {

            console.log("result", result);

            addValueInStorage('organizationId', result.id)


            router.push("/screens")
        }


        console.log(result)
    };

    return (
        <Container fluid className="d-flex justify-content-center" style={{marginTop: '10vh'}}>
            <Row className="w-100" style={{maxWidth: 500}}>
                <Col xs={12} className="text-center mb-4">
                    <h2 className="fw-bold">Создать организацию</h2>
                </Col>
                <Col xs={12}>
                    <Form className="px-3">
                        <Form.Group controlId="orgName" className="mb-3">
                            <Form.Control
                                type="text"
                                value={orgName}
                                onChange={(e) => setOrgName(e.target.value)}
                                placeholder="Введите название"
                                className="shadow-sm"
                            />
                        </Form.Group>
                        <div className="text-center">
                            <Button variant="primary" onClick={handleSave}>
                                Сохранить
                            </Button>
                        </div>
                    </Form>
                </Col>
            </Row>
        </Container>
    );

}

