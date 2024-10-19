<?php
    $entityBody = file_get_contents('php://input');
    $data = json_decode($entityBody);
    if (isset ($data) && sizeOf($data->scores) >= 10) {
        $result = fputs(fopen("etc/scores.json",
            "w"), $entityBody);
        echo json_encode(
            array(
                "success" => $result
            )
        );
    } else {
        echo json_encode(
            array(
                "success" => false
            )
        );
    }