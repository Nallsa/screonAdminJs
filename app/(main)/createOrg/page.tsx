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
import {useSettingsStore} from "@/app/store/settingsStore";
import {WarningModal} from "@/app/components/Common/WarningModal";

export default function CreateOrgPage() {
    const [orgName, setOrgName] = useState('');
    const router = useRouter()
    const {
        setOrganizationId,
        createOrganization,
        errorMessage,
        successMessage,
        setError,
        setSuccess
    } = useSettingsStore()

    const handleSave = async () => {
        if (!orgName.trim()) {
            setError('Название не может быть пустым')
            return
        }

        const orgId = await createOrganization(orgName.trim())

        if (orgId) {
            router.push('/screens')
        }
    }
    const handleModalClose = () => {
        setSuccess(null)
        router.push('/screens')
    }

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

            {/*{successMessage && (*/}
            {/*    <WarningModal*/}
            {/*        show={!!successMessage}*/}
            {/*        title="Готово"*/}
            {/*        message={successMessage || ''}*/}
            {/*        buttonText="Ок"*/}
            {/*        onClose={handleModalClose}*/}
            {/*    />*/}
            {/*)}*/}
        </Container>
    );

}

