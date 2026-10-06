import os
import random
import tkinter as tk
from PIL import Image, ImageTk

DEPLOYMENT = "deployment/"
SECONDARIES = "secondary_missions/"
PRIMARIES = "primary_missions/"
MISSION_RULES = "mission_rules/"

def get_random_file(directory):
    # Get all file paths
    files = [f for f in os.listdir(directory) if os.path.isfile(os.path.join(directory, f))]

    if not files:
        return None
    
    return os.path.join(directory, random.choice(files))

class ImageViewer:
    def __init__(self, master):
        self.master = master
        master.title("Warhammer Card Selector")

        self.image_refs = []

        self.display_frame = tk.Frame(master)
        self.display_frame.pack()

        self.img_labels = [tk.Label(self.display_frame) for _ in range(3)]
        for lbl in self.img_labels:
            lbl.pack(side=tk.LEFT, padx=5, pady=5)

        # attacker row of images
        self.seconaries = tk.Frame(master)
        self.seconaries.pack()

        self.attacker_labels = [tk.Label(self.seconaries), tk.Label(self.seconaries)]
        for lbl in self.attacker_labels:
            lbl.pack(side=tk.LEFT, padx=5, pady=5)
        
        # defender row of images
        #self.defender_frame = tk.Frame(master)
        #self.defender_frame.pack()

        self.defender_labels = [tk.Label(self.seconaries), tk.Label(self.seconaries)]
        for lbl in self.defender_labels:
            lbl.pack(side=tk.LEFT, padx=5, pady=5)
        
        # Frame for buttons
        self.button_frame = tk.Frame(master)
        self.button_frame.pack(pady=10)

        # frame for secondaries
        self.secondary_frame = tk.Frame(master)
        self.secondary_frame.pack(pady=10)

        # frame for redraws
        self.tertiary_frame = tk.Frame(master)
        self.tertiary_frame.pack(pady=10)

        # Buttons to diplay images
        btn1 = tk.Button(self.button_frame, text='Deployment', command=lambda: self.show_image(0, get_random_file(DEPLOYMENT)))
        btn2 = tk.Button(self.button_frame, text='Mission Rule', command=lambda: self.show_image(1, get_random_file(MISSION_RULES)))
        btn3 = tk.Button(self.button_frame, text='Primary', command=lambda: self.show_image(2, get_random_file(PRIMARIES)))
        btn4 = tk.Button(self.secondary_frame, text='Attacker Secondaries', command=lambda: self.show_secondary_image(SECONDARIES, self.attacker_labels))
        btn5 = tk.Button(self.secondary_frame, text='Defender Secondaries', command=lambda: self.show_secondary_image(SECONDARIES, self.defender_labels))
        btn6 = tk.Button(self.tertiary_frame, text='Redraw Left Attacker', command=lambda: self.redraw_image(get_random_file(SECONDARIES), self.attacker_labels, 0))
        btn7 = tk.Button(self.tertiary_frame, text='Redraw Right Attacker', command=lambda: self.redraw_image(get_random_file(SECONDARIES), self.attacker_labels, 1))
        btn8 = tk.Button(self.tertiary_frame, text='Redraw Left Defender', command=lambda: self.redraw_image(get_random_file(SECONDARIES), self.defender_labels, 0))
        btn9 = tk.Button(self.tertiary_frame, text='Redraw Right Defender', command=lambda: self.redraw_image(get_random_file(SECONDARIES), self.defender_labels, 1))


        for btn in [btn1, btn2, btn3, btn4, btn5, btn6, btn7, btn8, btn9]:
            btn.pack(side=tk.LEFT, padx=5)

        self.pair_frame = tk.Frame(master)
        self.pair_frame.pack(pady=10)

        self.pair_label = [tk.Label(self.pair_frame), tk.Label(self.pair_frame)]
        for lbl in self.pair_label:
            lbl.pack(side=tk.LEFT, padx=5)

    def show_image(self, slot_index, path):
        img = Image.open(path)
        img.thumbnail((300, 300))
        tk_img = ImageTk.PhotoImage(img)

        self.img_labels[slot_index].configure(image=tk_img)
        self.img_labels[slot_index].image = tk_img
    
    def show_secondary_image(self, path, lables):
        secondaries = [get_random_file(path) for _ in range(2)]

        for i, path in enumerate(secondaries):
            img = Image.open(path)
            img.thumbnail((400, 400))
            tk_img = ImageTk.PhotoImage(img)
            lables[i].configure(image=tk_img)
            lables[i].image = tk_img
    
    def redraw_image(self, path, labels, index):
        img = Image.open(path)
        img.thumbnail((400, 400))
        tk_img = ImageTk.PhotoImage(img)
        labels[index].configure(image=tk_img)
        labels[index].image = tk_img

root = tk.Tk()
app = ImageViewer(root)
root.mainloop()